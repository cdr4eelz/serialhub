
# serialhub

[![Build Widget](https://github.com/cdr4eelz/serialhub/actions/workflows/build-widget.yml/badge.svg)](https://github.com/cdr4eelz/serialhub/actions/workflows/build-widget.yml)
[![pypi](https://img.shields.io/pypi/v/serialhub.svg)](https://pypi.python.org/pypi/serialhub)
[![license](https://img.shields.io/github/license/cdr4eelz/serialhub.svg)](https://github.com/cdr4eelz/serialhub/blob/master/LICENSE.txt)
[![codecov of python](https://codecov.io/gh/cdr4eelz/serialhub/branch/master/graph/badge.svg)](https://codecov.io/gh/cdr4eelz/serialhub)

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/cdr4eelz/serialhub/master?labpath=examples%2Fintroduction.ipynb)  <<==-- Try it NOW, _conveniently pre-installed_ in a JupyterLab on mybinder.org _(Serial communication requires a browser with Web Serial API such as Chrome/Edge, see below)_

This is a custom IPython/Jupyter widget for use in JupyterLab.  It allows _serial communication_ from python code running in a notebook, even when hosted in the cloud (via JupyterHub, for example).  An _end user_ serial device is accessed indirectly via a web browser's implementation of the [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) (MUST be present to be useful).  As of 2021, the [Web Serial Spec](https://wicg.github.io/serial/) is _present ONLY in recent Google Chrome & Microsoft Edge_ browsers.  Consider checking [this browser support matrix](https://developer.mozilla.org/en-US/docs/Web/API/SerialPort#browser_compatibility) in case of future implementation in other browsers.


## Project Goals and high-level description

**_WARNING_**: This Widget extension is **still in early development** and taking shape.  _Any component, class, method, etc. may be renamed or re-designed_, as these early versions progress.  Versions in the 0.0.xx series may be partially non-functional at times, as the code matures from infancy!  Hoping to reach 0.1.xx maturity soon, feel free to help via feedback, issues, complaints, etc. :)

Enable python code running in a python3 kernel of a Jupyter notebook to connect, read & write data, etc. with a serial device present _on the end users' computers_.  This "backend" python code/ipykernel may, therefore, be hosted via cloud/server in an online JupyterHub, etc.  The backend code initiates display of the "SerialHubPort" custom IPython Widget in a notebook cell, with which the user then initiates the serial connection.  The backend can optionally set a filter based on USB Vendor and Product codes, to narrow the list of serial ports presented to the user.  It can also specifiy serial port options (such as baudRate, parity, etc.) _before_ the port is opened by the user.

The frontend JavaScript portion of the widget detects if the Web Serial API is supported in the user's browser, and presents a BUTTON used to initiate the opening of a serial port.  Note that the Web Serial API requires the initial "request" for a serial port to be _initiated by explicit user action_, such as a click.  This was a key motivation for implementing serialhub as a **visible** "DOM widget" to be used in a notebook cell.  The widget also presents diagnostic data/statistics on read & written data.  Inbound serial data read by the frontend is relayed to the backend code (which can report it via a callback function).  Data written by the backend is relayed to the frontend as custom widget messages, and then written to the browser's serial port connection and ultimately the end user's serial device.  The frontend treats all data as strictly "binary", so that the backend (python code) is fully responsible for text encodings of the streams (ascii, UTF-8, etc), as would be the case with direct serial device communication.

A helper serialhub.SerialIO class may be used to translate the callback-based widget communications into a readable & writable (but not seekable) io.RawIOBase binary stream.  This is intended to help existing code to use a more familiar interface, if desired, at the cost of buffering recv/reads from the client (which the SerialIO class implements).  This class implements _a few_ helper methods to mimick a small subset of "pyserial" style access, though it only strictly implements the io.RawIOBase interface.

The inspiration for this project was a to allow educational projects using physical serail devices to be hosted in a cloud environment.  The specifics of that use case, talking to code running in an Arduino-style device while hosted in a shared JupyterHub server, have the most influence on the goals of this extension.  Nonetheless, attempts are/will be made to provide for other/generic use cases.


## Installation

Within your JupyterLab environment, install the "labextension" via "pip":

```bash
pip install serialhub
```
_(The above can be done within a running Terminal or Notebook, but should be followed by python kernel restart and browser refresh to load the newly added extension)_

The "serialhub" widget should then show up with "OK" status in the list of current JupyterLab extensions:
```bash
jupyter labextension list
```

The widget aims to remain useable in "Classic notebook" environments as well, though testing is focused on use within modern JupyterLab notebooks.  See "Caveats" below.


### Caveats

If not present in your jupyterlab, you might need jupyterlab-manager?  (Perhaps when running a rather old JupyterLab version???)
```bash
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using as a classic nbextension with Jupyter Notebook 5.2 or earlier,
 you may also need to enable the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] serialhub
```

NOTE:  There were some NPM versions of the widget in the past which are NOT to be used.  **Only use a "pip" style install** of serialhub (or "conda" if the extension becomes available on conda-forge in the future)!  The _depricated_ serialhub "node packages" were never useful anyway, as _NPM cannot install the required python backend portion of the plugin._


## Post-installation

After installation (or upgrade) into a **running** Jupyter environment you will need to _restart a running ipykernel and also refresh the webpage_ in your browser.  This latter manual step ensures that the JavaScript portion is loaded into your browser (happens at page load, not later).  This is the case, especially if you are an unprivileged end user of a running JupyterLab/JupyterHub in which the admin has NOT pre-installed the serialhub extension.  Manual refreshing is not necessary in the "Binder" environment (see the Binder badge at top of the project README), which has a pre-installed _development_ version of the plugin already active before the JupyterLab itself loads up.


## Using "SerialHub"

Please refer to the introduction.ipynb or firsttest.ipynb in the examples directory.  Using the extension involves constructing and rendering an instance of the serialhub.SerialHubPort() widget into a notebook cell.  The end-user must then perform a click on the "connect button" of the widget and select a serial port to open.  Once the user connects up the frontend, the backend can begin sending serial data and should be receiving the data as well (relayed via the frontend).

A more formal description of the widget and helper classes will be developed _after_ it's features and implementation have stabilized to a mature status.
