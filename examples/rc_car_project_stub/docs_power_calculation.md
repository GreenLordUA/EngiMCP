---
id: DOC-RC-CAR-POWER
kind: calculation
status: draft
version: 0.1.0
depends_on:
  - DOC-RC-CAR-BATTERY
  - DOC-RC-CAR-MOTORS
impacts:
  - DOC-RC-CAR-BOM
---

# Radio-Controlled Car Power Calculation

## Current Budget

Power calculations combine motor stall current, expected duty cycle, driver losses, and battery reserve.

## Battery Impact

Changing the battery changes voltage sag, runtime margin, and driver thermal assumptions.
