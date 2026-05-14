"""sync_models_to_schema_final

Revision ID: 7d5ef2a1b93c
Revises: 6c4da1f85e2b
Create Date: 2026-03-01 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7d5ef2a1b93c'
down_revision: Union[str, Sequence[str], None] = '6c4da1f85e2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. BoardDailySummary: Change from Integer/BigInteger to Numeric(10, 2)
    # Using specific type casting to avoid errors if data exists
    op.alter_column('board_daily_summary', 'avg_download',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=10, scale=2),
               postgresql_using='avg_download::numeric(10,2)',
               existing_nullable=True)
    op.alter_column('board_daily_summary', 'max_download',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=10, scale=2),
               postgresql_using='max_download::numeric(10,2)',
               existing_nullable=True)
    op.alter_column('board_daily_summary', 'avg_upload',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=10, scale=2),
               postgresql_using='avg_upload::numeric(10,2)',
               existing_nullable=True)
    op.alter_column('board_daily_summary', 'max_upload',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=10, scale=2),
               postgresql_using='max_upload::numeric(10,2)',
               existing_nullable=True)

    # 2. AuditLog: Change from JSON to JSONB
    op.alter_column('audit_logs', 'details',
               existing_type=postgresql.JSON(astext_type=sa.Text()),
               type_=postgresql.JSONB(astext_type=sa.Text()),
               postgresql_using='details::jsonb',
               existing_nullable=True)


def downgrade() -> None:
    # 1. Revert BoardDailySummary
    op.alter_column('board_daily_summary', 'max_upload',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Integer(),
               postgresql_using='max_upload::integer',
               existing_nullable=True)
    op.alter_column('board_daily_summary', 'avg_upload',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Integer(),
               postgresql_using='avg_upload::integer',
               existing_nullable=True)
    op.alter_column('board_daily_summary', 'max_download',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Integer(),
               postgresql_using='max_download::integer',
               existing_nullable=True)
    op.alter_column('board_daily_summary', 'avg_download',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Integer(),
               postgresql_using='avg_download::integer',
               existing_nullable=True)

    # 2. Revert AuditLog
    op.alter_column('audit_logs', 'details',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               type_=postgresql.JSON(astext_type=sa.Text()),
               postgresql_using='details::json',
               existing_nullable=True)
