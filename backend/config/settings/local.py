from . import base as base_settings

globals().update({name: getattr(base_settings, name) for name in dir(base_settings) if name.isupper()})

DEBUG = True
