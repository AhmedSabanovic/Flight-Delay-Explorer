# US Airports Visualization

An interactive visualization of airports across the United States, showing airport locations and delay percentages.

## Features
- Interactive map with pan and zoom functionality
- Airport markers sized based on zoom level
- Clustering of airports at lower zoom levels
- Color coding based on delay percentages
- Easy-to-use zoom controls

## Prerequisites
- Web browser with JavaScript enabled
- Local web server (to avoid CORS issues with local files)

## Running the Application

1. Clone or download this repository
2. Start a local web server in the project root directory. For example:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000
3. Open your web browser and navigate to:
http://localhost:8000/src/index.html

## Controls
Click + to zoom in
Click - to zoom out
Click Reset to return to default view
Click and drag to pan across the map