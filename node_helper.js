const NodeHelper = require("node_helper")
const Log = require("logger");
const moment = require("moment");

module.exports = NodeHelper.create({
  start() {
    Log.log(`Starting node helper for: ${this.name}`);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_DEPARTURES") {
      console.log(payload);
      this.fetchNextDepartures(payload.id, payload.line, payload.stop, payload.destination, payload.maxResults, payload.minGap, payload.apiKey);
    }
  },

  getApiUrl(line, stop) {
    return `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?LineRef=${line}&MonitoringRef=${stop}`
  },

  getHeaders(apiKey) {
    return {
      apiKey,
    }
  },

  getDeparturesForDestination(responseData, destination) {
    return responseData.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit
      .filter(c => c.MonitoredVehicleJourney.DestinationRef.value === destination)
  },

  fetchNextDepartures(id, line, stop, destination, maxResults, minGap, apiKey) {
    fetch(this.getApiUrl(line, stop), { headers: this.getHeaders(apiKey) })
      .then(response => response.json())
      .then((responseData) => {

        const data = this.getDeparturesForDestination(responseData, destination);
        Log.info(`Received ${data.length} departures for ${line} at ${stop} towards ${destination}`);
        return data.map((d) => {
          const departure = d.MonitoredVehicleJourney.MonitoredCall

          return {
            datetime: departure.ExpectedArrivalTime,
            destination: departure.DestinationDisplay?.[0]?.value,
            time: moment(departure.ExpectedArrivalTime).format("HH:mm"),
            relativeTime: moment(departure.ExpectedArrivalTime).fromNow(),
            atStop: departure.VehicleAtStop,
            status: departure.DepartureStatus,
            note: d.MonitoredVehicleJourney.JourneyNote?.[0]?.value,
          }
        })
      })
      .then((departures) => {
        this.sendSocketNotification("IDFMOBILITE_EVENT", {
          id,
          type: "DEPARTURES_RECEIVED",
          departures: departures.filter(d => !minGap || moment(d.datetime).isAfter(moment().add(minGap, "minutes"))).slice(0, maxResults),
        });
      })
      .catch((error) => {
        Log.error(error)
        this.sendSocketNotification("IDFMOBILITE_EVENT", {
          type: "ERROR",
          id,
          error,
        })
      });
  },

})
