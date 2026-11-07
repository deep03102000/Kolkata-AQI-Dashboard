# Bridge Concept

A bridge is the overlapping part between two station circles on the map.

Each station is shown with a 3 km circle. When two stations are close enough, those circles overlap. That overlap is called a bridge.

## In this project

This project has two bridge features:

- The general bridge overlay, which works for all six AQI stations
- The trio bridge overlay, which works only for these three stations:
  - Jadavpur
  - Rabindra Sarobar
  - Ballygunge

## How to understand it easily

Think of each station as a point with a circle around it.

- If one station is selected, you see only its circle.
- If two stations are selected and they are a valid pair, you see both circles and the bridge between them.
- If all three trio stations are selected, you can see the bridges for the valid pairs among those three stations.

## Why the bridge is useful

The bridge helps show how stations are connected in space.

It makes the map easier to read because you can quickly see:

- which stations are nearby
- where two station circles overlap
- how the selected stations relate to each other

## How colors work

The bridge colors come from the AQI colors of the stations.

This means:

- each station keeps its own AQI color
- the bridge also reflects those station colors
- if AQI changes, the colors on the map can change too

If live AQI is not available, the app uses the latest known value it has.

## Simple example

If a user selects Jadavpur and Rabindra Sarobar:

- both station circles appear
- the bridge appears if that pair is valid

If Ballygunge is also selected:

- the third circle appears
- any valid trio bridge connections also appear

## Short summary

A bridge is simply the shared area where two station circles overlap.
It helps users understand nearby stations in a clear and visual way.

The trio bridge is a separate feature from the general bridge overlay, so both should stay independent.
