"""manual_add_analysis_indexes

Revision ID: bf3ce83e9242
Revises: 356d59a65e84
Create Date: 2026-03-03 16:54:48.966675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf3ce83e9242'
down_revision: Union[str, Sequence[str], None] = '356d59a65e84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Indexes for analysis optimization
    op.create_index('idx_client_stats_brd_time', 'board_client_stats', ['board_id', 'log_time'], unique=False)
    op.create_index('idx_resource_stats_brd_time', 'board_resource_stats', ['board_id', 'log_time'], unique=False)
    op.create_index('idx_speed_brd_time', 'board_speed_stats', ['board_id', 'log_time'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_client_stats_brd_time', table_name='board_client_stats')
    op.drop_index('idx_resource_stats_brd_time', table_name='board_resource_stats')
    op.drop_index('idx_speed_brd_time', table_name='board_speed_stats')
