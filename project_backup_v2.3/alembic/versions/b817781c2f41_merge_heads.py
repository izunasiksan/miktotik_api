"""merge_heads

Revision ID: b817781c2f41
Revises: 03ba6b74d0e9, bf3ce83e9242
Create Date: 2026-03-05 21:21:37.783246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b817781c2f41'
down_revision: Union[str, Sequence[str], None] = ('03ba6b74d0e9', 'bf3ce83e9242')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
