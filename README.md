
# serialhub

[![Build Status](https://travis-ci.org//serialhub.svg?branch=master)](https://travis-ci.org//serialhub)
[![codecov](https://codecov.io/gh//serialhub/branch/master/graph/badge.svg)](https://codecov.io/gh//serialhub)


Jupyter Widget for WebSerial

## Installation

You can install using `pip`:

```bash
pip install serialhub
```

Or if you use jupyterlab:

```bash
pip install serialhub
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] serialhub
```
