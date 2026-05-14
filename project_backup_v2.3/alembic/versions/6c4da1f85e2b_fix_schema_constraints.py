"""fix_hotspot_and_constraints

Revision ID: 6c4da1f85e2b
Revises: 5b3ca2d94f79
Create Date: 2026-03-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c4da1f85e2b'
down_revision: Union[str, Sequence[str], None] = '5b3ca2d94f79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Fix HotspotUsageMonthly
    # Note: If table has data, this might fail without a default value. 
    # Assumed empty or fine to fail in strict mode.
    op.add_column('hotspot_usage_monthly', sa.Column('month_period', sa.Date(), nullable=False))
    op.add_column('hotspot_usage_monthly', sa.Column('is_frequent_user', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('hotspot_usage_monthly', sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    
    op.create_unique_constraint('unique_user_monthly', 'hotspot_usage_monthly', ['username', 'month_period'])

    # 2. Add Missing Unique Constraints
    op.create_unique_constraint('unique_mapping', 'telegram_recipients', ['bot_id', 'board_id', 'chat_id'])
    op.create_unique_constraint('unique_board_port', 'board_interface_configs', ['board_id', 'interface_name'])
    op.create_unique_constraint('unique_daily_usage', 'board_interface_usage', ['board_id', 'interface_name', 'log_date'])
    op.create_unique_constraint('unique_pppoe_daily', 'board_pppoe_usage', ['board_id', 'pppoe_username', 'log_date'])
    op.create_unique_constraint('unique_user_daily_raw', 'hotspot_usage_raw', ['username', 'board_id', 'log_date'])


def downgrade() -> None:
    # 1. Remove Constraints
    op.drop_constraint('unique_user_monthly', 'hotspot_usage_monthly', type_='unique')
    op.drop_constraint('unique_mapping', 'telegram_recipients', type_='unique')
    op.drop_constraint('unique_board_port', 'board_interface_configs', type_='unique')
    op.drop_constraint('unique_daily_usage', 'board_interface_usage', type_='unique')
    op.drop_constraint('unique_pppoe_daily', 'board_pppoe_usage', type_='unique')
    op.drop_constraint('unique_user_daily_raw', 'hotspot_usage_raw', type_='unique')

    # 2. Remove Columns
    op.drop_column('hotspot_usage_monthly', 'last_updated')
    op.drop_column('hotspot_usage_monthly', 'is_frequent_user')
    op.drop_column('hotspot_usage_monthly', 'month_period')
