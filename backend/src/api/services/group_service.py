"""
Service layer for Group operations.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.api.repositories.group_repository import (
    create_group,
    get_group_by_id,
    get_group_by_access_code,
    add_user_to_group,
    get_user_groups,
    is_user_member_of_group,
    get_group_documents,
    get_group_activities,
    create_group_activity,
    get_activity_by_id,
    delete_activity,
    delete_group_activities_by_group,
    remove_user_from_group,
    get_group_activity_by_document,
    delete_group,
    unlink_document_from_group
)
from src.api.repositories.document_repository import (
    get_document_by_public_id,
    share_document_with_group
)
from src.api.repositories.user_repository import get_user_by_id


def create_group_service(db: Session, name: str, description: str, creator_id: int):
    from src.models.group import Group
    from sqlalchemy.exc import IntegrityError
    if db.query(Group).filter(Group.name == name).first():
        raise HTTPException(status_code=400, detail="A War Room with this name already exists")
    try:
        return create_group(db, name=name, description=description, creator_id=creator_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A War Room with this name already exists")


def invite_user_to_group_service(db: Session, group_id: int, user_id: int, requester_id: int, requester_is_admin: bool):
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="The group does not exists.")

    if group.created_by_id != requester_id and not requester_is_admin:
        raise HTTPException(status_code=403, detail="Moderators-only action.")

    user_to_add = get_user_by_id(db, user_id)
    if not user_to_add:
        raise HTTPException(status_code=404, detail="The invited user does not exists.")

    add_user_to_group(db, user_id=user_id, group_id=group_id)
    return user_to_add


def get_my_groups_service(db: Session, user_id: int):
    return get_user_groups(db, user_id=user_id)


def get_war_room_documents_service(db: Session, group_id: int, user_id: int):
    if not is_user_member_of_group(db, user_id, group_id):
        raise HTTPException(status_code=403, detail="Not a member of this room")

    docs = get_group_documents(db, group_id)
    for doc in docs:
        doc.owner_username = doc.owner.username
    return docs


def get_group_activity_service(db: Session, group_id: int, user_id: int):
    if not is_user_member_of_group(db, user_id, group_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return get_group_activities(db, group_id)


def delete_group_service(db: Session, group_id: int, user_id: int, user_is_admin: bool):
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="War Room not found")

    if group.created_by_id != user_id and not user_is_admin:
        raise HTTPException(status_code=403, detail="Only the moderator can delete this room")

    delete_group_activities_by_group(db, group_id)
    delete_group(db, group)


def join_group_by_code_service(db: Session, access_code: str, user_id: int):
    group = get_group_by_access_code(db, access_code)
    if not group:
        raise HTTPException(status_code=404, detail="Invalid access code. The War Room does not exist.")

    if is_user_member_of_group(db, user_id, group.id):
        raise HTTPException(status_code=400, detail="You are already a member of this alliance.")

    add_user_to_group(db, user_id=user_id, group_id=group.id, role="member")
    return group


def remove_shared_document_service(db: Session, activity_id: int, user_id: int):
    activity = get_activity_by_id(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Share activity not found")

    document = get_document_by_public_id(db, activity.document_public_id)
    if not document or document.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You can only remove your own shared scrolls")

    unlink_document_from_group(db, document)
    delete_activity(db, activity)


def leave_group_service(db: Session, group_id: int, user_id: int):
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="War Room not found")

    if group.created_by_id == user_id:
        raise HTTPException(status_code=400, detail="Moderators cannot leave the room, they must delete it.")

    if not is_user_member_of_group(db, user_id, group_id):
        raise HTTPException(status_code=400, detail="You are not a member of this room.")

    remove_user_from_group(db, user_id=user_id, group_id=group_id)
    return group


def share_document_to_group_service(db: Session, public_id: str, group_id: int, user_id: int, user_is_admin: bool):
    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not your scroll to share")

    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not is_user_member_of_group(db, user_id, group_id) and not user_is_admin:
        raise HTTPException(status_code=403, detail="You are not a member of this War Room")

    existing_share = get_group_activity_by_document(db, group_id, public_id)
    if existing_share:
        raise HTTPException(
            status_code=400,
            detail=f"The scroll '{doc.title}' is already present in this War Room."
        )

    share_document_with_group(db, public_id, group_id)
    create_group_activity(
        db,
        group_id=group_id,
        user_id=user_id,
        document_public_id=public_id,
        content="shared a summerized scroll"
    )

    return {"message": f"The document '{doc.title}' has been shared with '{group.name}'"}
