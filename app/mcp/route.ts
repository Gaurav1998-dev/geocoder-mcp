import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

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
  },
  {
    capabilities: {
      tools: {
        geocode: {
          description:
            "Geocode an address to get latitude and longitude coordinates using Open-Meteo API",
        },
      },
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
