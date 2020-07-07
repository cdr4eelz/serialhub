
# serialhub

[![Build Status](https://travis-ci.org/cdr4eelz/serialhub.svg?branch=master)](https://travis-ci.org/cdr4eelz/serialhub)
[![codecov](https://codecov.io/gh/cdr4eelz/serialhub/branch/master/graph/badge.svg)](https://codecov.io/gh/cdr4eelz/serialhub)


WebSerial widget for Jupyter Hub and Lab

## Installation

If you use jupyterlab:

```bash
pip install serialhub
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] serialhub
```
