# US Flight Delay Explorer

An interactive visualization of flight delays across the United States, showcasing airport locations, delay percentages, and related statistics.
## Dataset used

**Flight Delay and Cancellation Dataset (2019-2023)**
- https://www.kaggle.com/datasets/patrickzel/flight-delay-and-cancellation-dataset-2019-2023/data?select=flights_sample_3m.csv

## Features
- **Interactive Map:**
  - Pan and zoom functionality with smooth transitions.
  - Responsive design ensuring optimal display across devices.
- **Airport Visualization:**
  - Markers sized dynamically based on zoom level.
  - Clustering of airports at lower zoom levels to enhance clarity.
  - Color-coded markers representing delay percentages.
- **Filter Options:**
  - Select year to view data from 2019 to 2022.
  - Set minimum percentage of delayed flights.
  - Specify minimum number of connections.
- **Histograms:**
  - **Percentage of Delayed Flights:** Visual representation of delayed flight percentages.
  - **Average Delay (Minutes):** Displays the average delay time in minutes.
- **Tooltips:**
  - Hover over markers to view detailed information about individual airports or clusters.
- **Zoom Controls:**
  - Buttons to easily zoom in, zoom out, and reset to the default view.
- **Legend:**
  - Clear legend indicating the color scale for delay percentages.
- **Performance Enhancements:**
  - Data caching for faster load times and smoother interactions.
  - Predictive loading of adjacent years to minimize wait times.

## Prerequisites
- **Web Browser:** Modern browser with JavaScript enabled.
- **Local Web Server:** Required to run the application locally and avoid CORS issues.

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
- Zoom In (+): Click to zoom into the map.
- Zoom Out (−): Click to zoom out of the map.
- Reset (⟲): Click to return to the default map view.
- Pan: Click and drag the map to navigate different regions.
- Filter Panel: Adjust filters to customize the displayed data based on year, delay percentage, and number of connections.
- Hover Tooltips: Hover over airport markers to view detailed information.
