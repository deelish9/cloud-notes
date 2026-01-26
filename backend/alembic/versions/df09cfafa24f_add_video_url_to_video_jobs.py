"""add video_url to video_jobs

Revision ID: df09cfafa24f
Revises: 996bb411a477
Create Date: 2026-01-15 07:08:10.036527

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df09cfafa24f'
down_revision: Union[str, None] = '996bb411a477'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "video_jobs",
        sa.Column("video_url", sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column("video_jobs", "video_url")

