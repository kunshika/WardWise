from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, auth, models

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[schemas.UserResponse])
def read_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    users = crud.get_users(db)
    return users

@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    db_user = crud.get_user_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    return crud.create_user(db, user_in=user_in)

@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user_details(
    user_id: int,
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    # Cannot deactivate yourself
    if user_id == current_user.id and user_in.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot deactivate their own account"
        )
    updated_user = crud.update_user(db, user_id=user_id, user_in=user_in)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user
