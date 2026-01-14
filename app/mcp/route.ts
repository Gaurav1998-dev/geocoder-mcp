import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

interface WeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

// test comment

// StreamableHttp server
const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "geocode",
      "Geocode an address to get latitude and longitude coordinates.",
      {
        address: z.string().describe("The address to geocode"),
      },
      async ({ address }) => {
        try {
          console.log("address", address);

          const encodedAddress = encodeURIComponent(address);

          console.log("encodedAddress", encodedAddress);

          const url = `https://customer-geocoding-api.open-meteo.com/v1/search?apikey=&name=${encodedAddress}&count=1`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (!data.results || data.results.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No geocoding results found for address: ${address}`,
                },
              ],
            };
          }

          console.log("data", data);

          // If count is 1, return just the coordinates of the first result
          const firstResult = data.results[0];
          const coordinates = {
            latitude: firstResult.latitude,
            longitude: firstResult.longitude,
          };

          console.log("firstResult", firstResult);
          console.log("coordinates", coordinates);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(coordinates, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error geocoding address "${address}": ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
          };
        }
      }
    );
    server.tool(
      "get_weather_forecast",
      "Get hourly temperature forecast for a given location using longitude and latitude coordinates",
      {
        latitude: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude coordinate (-90 to 90)"),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude coordinate (-180 to 180)"),
      },
      async ({ latitude, longitude }) => {
        try {
          console.log("latitude", latitude);
          console.log("longitude", longitude);

          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit`;
          const response = await fetch(url);

          console.log("response", response);

          if (!response.ok) {
            throw new Error(
              `Weather API request failed: ${response.status} ${response.statusText}`
            );
          }

          const weatherData: WeatherResponse = await response.json();

          console.log("weatherData", weatherData);

          const currentTime = new Date().toISOString();
          const currentHourIndex = weatherData.hourly.time.findIndex(
            (time) => time >= currentTime.slice(0, 13)
          );
          const nextHours = Math.min(
            24,
            weatherData.hourly.time.length - Math.max(0, currentHourIndex)
          );

          const forecast = weatherData.hourly.time
            .slice(
              Math.max(0, currentHourIndex),
              Math.max(0, currentHourIndex) + nextHours
            )
            .map((time, index) => ({
              time,
              temperature:
                weatherData.hourly.temperature_2m[
                  Math.max(0, currentHourIndex) + index
                ],
              weatherCode:
                weatherData.hourly.weather_code[
                  Math.max(0, currentHourIndex) + index
                ],
              unit: weatherData.hourly_units.temperature_2m,
            }));

          console.log("forecast", forecast);

          const text =
            `Weather Forecast for coordinates (${latitude}, ${longitude}):\n\n` +
            `Next ${forecast.length} Hours Temperature Forecast:\n` +
            forecast
              .map(
                (f) =>
                  `- ${f.time}: ${f.temperature}${f.unit} (weatherCode: ${f.weatherCode})`
              )
              .join("\n");

          console.log("text", text);

          return {
            content: [
              {
                type: "text",
                text: text,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching weather data: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {},
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
