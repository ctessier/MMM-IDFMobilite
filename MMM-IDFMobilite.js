
Module.register("MMM-IDFMobilite", {

  defaults: {
    exampleContent: "",
    apiKey: "",
    title: "",
    line: "",
    stop: "",
    direction: "",
    maxResults: 3,
    minGap: 0,
  },

  // Define required scripts.
  getScripts() {
    return ["moment.js"];
  },

  /**
   * Apply the default styles.
   */
  getStyles() {
    return ["MMM-IDFMobilite.css"];
  },

  /**
   * Pseudo-constructor for our module. Initialize stuff here.
   */
  start() {
    this.departures = [];

    moment.locale(config.language);

    this.fetchNextDepartures();
    setInterval(() => this.fetchNextDepartures(), 60000);
  },

  fetchNextDepartures() {
    this.sendSocketNotification("FETCH_DEPARTURES", {
      id: this.config.title,
      line: this.config.line,
      stop: this.config.stop,
      destination: this.config.direction,
      maxResults: this.config.maxResults,
      minGap: this.config.minGap,
      apiKey: this.config.apiKey
    });
  },

  /**
   * Handle notifications received by the node helper.
   * So we can communicate between the node helper and the module.
   *
   * @param {string} notification - The notification identifier.
   * @param {any} payload - The payload data`returned by the node helper.
   */
  socketNotificationReceived: function(notification, payload) {
    if (notification === "IDFMOBILITE_EVENT" && payload.id === this.config.title) {
      switch (payload.type) {
        case "DEPARTURES_RECEIVED": {
          this.departures = payload.departures;
          this.updateDom();
          break;
        }
        case "ERROR": {
          Log.error(payload.error);
          break;
        }
        default: {
          Log.warn("Unknown event type received: " + payload);
        }
      }
    }
  },

  // Override getHeader method.
  getHeader () {
    if (this.departures.length > 0) {
      return `${this.config.title} - ${this.departures[0].destination}`;
    }

    return this.config.title;
  },

  /**
   * Render the page we're on.
   */
  getDom() {
    var table = document.createElement("table");

    // adding next schedules
    this.departures.forEach((d) => {
      var row = document.createElement("tr");
      var timeCell = document.createElement("td");
      timeCell.innerHTML = moment(d.datetime).format("HH:mm");
      timeCell.className = "cell time";
      row.appendChild(timeCell);

      if (d.note) {
        var noteCell = document.createElement("td");
        noteCell.innerHTML = d.note;
        noteCell.className = "cell note";
        row.appendChild(noteCell);
      }

      var atStopCell = document.createElement("td");
      atStopCell.innerHTML = d.atStop ? "🚆" : "";
      atStopCell.className = "cell at-stop";
      row.appendChild(atStopCell);

      var statusCell = document.createElement("td");
      statusCell.innerHTML = d.status === "onTime" ? "🟢" : `🟠  (${d.status})`;
      statusCell.className = "cell status";
      row.appendChild(statusCell);

      var releativeTimeCell = document.createElement("td");
      releativeTimeCell.innerHTML = moment(d.datetime).fromNow();
      releativeTimeCell.className = "cell relative-time";
      row.appendChild(releativeTimeCell);

      table.appendChild(row);
    });

    return table;
  },
});
