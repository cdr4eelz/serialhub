
# serialhub

[![Build Widget](https://github.com/cdr4eelz/serialhub/actions/workflows/build-widget.yml/badge.svg)](https://github.com/cdr4eelz/serialhub/actions/workflows/build-widget.yml)

WebSerial widget for JupyterLab: Allow simple serial communication from python code running in a notebook (on a hosted JupyterHub, for example).  The serial device is accessed indirectly via a web browser's implementation of the WebSerial API.  As of 2021, this API is currently present ONLY in recent Google Chrome & Microsoft Edge browsers.

(WARNING: This extension is still in early development and is still taking shape)


## Installation

If you use jupyterlab:

```bash
pip install serialhub
```

If not present in your jupyterlab, you might need jupyterlab-manager?
```bash
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

The "serialhub" widget should show up as "OK" status in the list of current jupyterlab extensions:
```bash
jupyter labextension list
```

If you are using as a classic nbextension with Jupyter Notebook 5.2 or earlier,
 you may also need to enable the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] serialhub
```

## Post-installation

After installation (or upgrade) you will likely need to refresh the JupyterLab page in your browser to get the JavaScript portion of the extension loaded into your browser.  This is the case if installing "on-the-fly" in a running JupyterLab (especially when on a JupyterHub pre-configured environment that lacks the extension in the underlying JupyerLab installation.


## Using "SerialHub"

Please refer to the introduction.ipynb or firsttest.ipynb in the examples directory.  Using the extension involves constructing and rendering a serialhub.SerialHubPort() widget into a notebook cell.  This is because certain WebSerial actions must be initiated by explicit action of the user (such as a "click" on the page).

