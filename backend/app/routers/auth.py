import os
import json
import logging
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

logger = logging.getLogger("academic_dashboard.auth")

from app.database import get_session, seed_demo_data
from app.models import Account, AccountRead, Course, Assignment, File
from app.security import encrypt_token
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from app.google_service import (
    is_google_configured,
    get_authorization_url,
    exchange_code_for_tokens,
    sync_account_classroom,
    sync_account_drive,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/status")
def get_auth_config_status():
    """Return whether Google OAuth credentials are configured."""
    return {
        "is_configured": is_google_configured(),
        "client_id_prefix": GOOGLE_CLIENT_ID[:12] + "..." if GOOGLE_CLIENT_ID else None,
        "demo_mode_available": True,
    }

@router.get("/accounts", response_model=List[AccountRead])
def get_accounts(session: Session = Depends(get_session)):
    """List all connected accounts."""
    accounts = session.exec(select(Account)).all()
    result = []
    for acc in accounts:
        result.append(
            AccountRead(
                id=acc.id,
                email=acc.email,
                account_type=acc.account_type,
                display_name=acc.display_name,
                avatar_url=acc.avatar_url,
                token_expiry=acc.token_expiry,
                last_synced_at=acc.last_synced_at,
                needs_reconnect=bool(acc.needs_reconnect),
                created_at=acc.created_at,
                is_connected=bool(acc.refresh_token),
            )
        )
    return result

def resolve_redirect_uri(request: Request) -> str:
    env_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if env_uri and "localhost" not in env_uri and "127.0.0.1" not in env_uri:
        return env_uri

    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    if forwarded_host and "localhost" not in forwarded_host and "127.0.0.1" not in forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}/api/auth/google/callback"

    return env_uri or "http://localhost:8000/api/auth/google/callback"

@router.get("/google/start")
def start_google_oauth(
    request: Request,
    account_type: str = Query("personal", pattern="^(personal|edu)$"),
):
    """Start Google OAuth 2.0 flow for personal or institutional account."""
    if not is_google_configured():
        raise HTTPException(
            status_code=400,
            detail="Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.",
        )
    try:
        redirect_uri = resolve_redirect_uri(request)
        logger.info(f"Starting Google OAuth with redirect_uri: {redirect_uri}")
        url, _ = get_authorization_url(account_type=account_type, redirect_uri=redirect_uri)
        return {"auth_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/google/callback")
def google_oauth_callback(
    request: Request,
    code: str = Query(...),
    state: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    """Handle callback from Google OAuth."""
    account_type = "personal"
    state_redirect_uri = None
    if state:
        try:
            parsed_state = json.loads(state)
            account_type = parsed_state.get("account_type", "personal")
            state_redirect_uri = parsed_state.get("redirect_uri")
        except Exception:
            pass

    effective_redirect_uri = state_redirect_uri or resolve_redirect_uri(request)

    try:
        logger.info(f"Processing Google OAuth callback with code length {len(code)}, redirect_uri: {effective_redirect_uri}")
        token_data = exchange_code_for_tokens(code, redirect_uri=effective_redirect_uri)
        email = token_data["email"]
        logger.info(f"OAuth code successfully exchanged for email: {email}")

        # Check if account exists or create
        account = session.exec(select(Account).where(Account.email == email)).first()
        if not account:
            account = Account(
                id=f"acc_{email.replace('@', '_').replace('.', '_')}",
                email=email,
                account_type=account_type,
                display_name=token_data.get("display_name"),
                avatar_url=token_data.get("avatar_url"),
                refresh_token=encrypt_token(token_data.get("refresh_token")),
                access_token=encrypt_token(token_data.get("access_token")),
                token_expiry=token_data.get("token_expiry"),
                created_at=datetime.now(timezone.utc),
            )
            session.add(account)
        else:
            account.account_type = account_type
            if token_data.get("refresh_token"):
                account.refresh_token = encrypt_token(token_data["refresh_token"])
            account.access_token = encrypt_token(token_data.get("access_token"))
            account.token_expiry = token_data.get("token_expiry")
            account.needs_reconnect = False
            session.add(account)

        session.commit()
        session.refresh(account)
        logger.info(f"Account {email} saved to database successfully!")

        # Trigger initial sync for this account
        try:
            sync_account_classroom(account, session)
            sync_account_drive(account, session)
            logger.info(f"Initial Classroom & Drive sync completed for {email}")
        except Exception as sync_err:
            logger.warning(f"Initial sync warning for {email}: {sync_err}")

        # Redirect back to frontend on same origin
        return RedirectResponse(url="/?auth_success=true", status_code=303)
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        encoded_err = urllib.parse.quote(str(e))
        return RedirectResponse(url=f"/?auth_error={encoded_err}", status_code=303)

@router.post("/accounts/disconnect/{account_id}")
def disconnect_account(account_id: str, session: Session = Depends(get_session)):
    """Disconnect and remove account and its linked data."""
    account = session.exec(select(Account).where(Account.id == account_id)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    session.delete(account)
    session.commit()
    return {"status": "SUCCESS", "message": f"Account {account.email} disconnected."}

@router.post("/demo/reset")
def reset_demo_data(session: Session = Depends(get_session)):
    """Reset database with demo data."""
    # Delete all data
    for model in [File, Assignment, Course, Account]:
        session.exec(select(model))
    session.rollback()
    
    # Clean recreate
    from app.database import engine
    from sqlmodel import SQLModel
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    seed_demo_data(session)
    return {"status": "SUCCESS", "message": "Demo data reset successfully."}
