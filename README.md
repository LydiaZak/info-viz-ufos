# UFO Sightings in the U.S. - info-viz-ufos #

A visualization built using HTML, CSS, JavaScript,
[D3 v4](https://d3js.org/), [webpack](https://webpack.github.io/),
[topojson](https://github.com/topojson/topojson), and [nodejs](https://nodejs.org/) to show UFO sightings in the US 1910-2014.

UFO data is from the National UFO Research Center
["UFO Sightings" dataset](http://www.nuforc.org/webreports.html).
This dataset contains over 80,000 reports of UFO sightings over the last century.
Time standardization and geocoding has been included in the dataset.
UFO sightings with missing or incomplete reports have been removed,
such as entries where the location of the sighting was not found or blank (0.8146%)
or have erroneous or blank time (8.0237%).This dataset was scraped, geolocated,
and time standardized from NUFORC data by Sigmond Axel [here](https://github.com/planetsig/ufo-reports)
and can be found on [Kaggle](https://www.kaggle.com/NUFORC/ufo-sightings).
Data contains city, state, time, description, and duration of each sighting.


## Setup ##

* [Install NodeJS v 6.10.1](https://nodejs.org/en/)
* Install topojson: `npm install -g topojson@1`
* [Install yarn](https://yarnpkg.com/en/docs/install)
* Install dependencies (cd to ufos dir): `yarn install`
* Install [gdal](http://www.gdal.org/): `brew install gdal`

To run: `npm start`

To build: `npm run build`