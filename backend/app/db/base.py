# defining a common “Base” that all tables inherit from

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
