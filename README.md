
# serialhub

[![Build Widget](https://github.com/cdr4eelz/serialhub/actions/workflows/build-widget.yml/badge.svg)](https://github.com/cdr4eelz/serialhub/actions/workflows/build-widget.yml)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/cdr4eelz/serialhub/master?labpath=examples%2Fintroduction.ipynb)

WebSerial widget for JupyterLab: Allow simple serial communication from python code running in a notebook (on a hosted JupyterHub, for example).  The serial device is accessed indirectly via a web browser's implementation of the [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) (if present).  As of 2021, the [Web Serial Spec](https://wicg.github.io/serial/) is currently _present ONLY in recent Google Chrome & Microsoft Edge_ browsers.  Consider checking [this browser support matrix](https://developer.mozilla.org/en-US/docs/Web/API/SerialPort#browser_compatibility) in case of future implementation.

## Project Goals

**_WARNING_**: This extension is **still in early development** and taking shape.  _Any component or function may be renamed or re-designed_, as versions progress.  The versions in the 0.0.xx series may be partially non-functional at times, as the code matures from infancy!

Allow python code running in the kernel of a notebook to connect (read & write data) with a serial device physically connected to the end users' computer.  The python kernel may be hosted via cloud/server in an online JupyterHub, etc.  The backend code allows display of the "SerialHubPort" custom IPython Widget with which the user initiates the serial connection.  The backend can set a filter based on USB Vendor and Product codes and can specifiy serial port options (such as baudRate) before the port is opened.

The frontend JavaScript code detects if the Web Serial API is supported, and presents a button used to initiate the opening of a serial port.  Note that the Web Serial API requires "request" for a serial port to be initiated by user action, such as a click.  The widget also presents diagnostic data/statistics on read & written data.  Inbound serial data read by the frontend is relayed to the backend code.  Data written by the backend is relayed to the frontend's serial port connection.  The frontend tries to treat data as strictly "binary", so that the backend is responsible and in control of any textual encoding of the streams (ascii, UTF-8, etc).


## Installation

Within your JupyterLab environment, install the "labextension" via "pip":

```bash
pip install serialhub
```
_(The above can be done within a running Terminal or Notebook, but should be followed by python kernel restart and browser refresh to load the newly added extension)_

The "serialhub" widget should show up as "OK" status in the list of current jupyterlab extensions:
```bash
jupyter labextension list
```

### Caveats

If not present in your jupyterlab, you might need jupyterlab-manager?
```bash
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using as a classic nbextension with Jupyter Notebook 5.2 or earlier,
 you may also need to enable the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] serialhub
```

NOTE: Only use a "pip" install of serialhub.  Do NOT use the old serialhub node packages.  The versions of this extension available via NPM are obsolete and not useful because serialhub includes/requires a python backend extension.  The NPM packages only contain the javascript "frontend" code, and are useless without also doing a "pip" install anyway.


## Post-installation

After installation (or upgrade) you will likely need to refresh the JupyterLab page in your browser to get the JavaScript portion of the extension loaded into your browser.  This is the case if installing "on-the-fly" in a running JupyterLab (especially when on a JupyterHub pre-configured environment that lacks the extension in the underlying JupyerLab installation.


## Using "SerialHub"

Please refer to the introduction.ipynb or firsttest.ipynb in the examples directory.  Using the extension involves constructing and rendering a serialhub.SerialHubPort() widget into a notebook cell.  This is because certain WebSerial actions must be initiated by explicit action of the user (such as a "click" on the page).  Once the user connects up the frontend, the backend can begin sending serial data and should be receiving the data as well (relayed via the frontend).
