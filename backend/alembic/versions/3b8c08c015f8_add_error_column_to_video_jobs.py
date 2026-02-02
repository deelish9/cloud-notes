"""add error column to video_jobs

Revision ID: 3b8c08c015f8
Revises: 06249c4990e2
Create Date: 2026-02-02 15:05:25.193084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b8c08c015f8'
down_revision: Union[str, None] = '06249c4990e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('video_jobs', sa.Column('error', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('video_jobs', 'error')
