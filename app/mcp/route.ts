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
          const api_key = process.env.MAPS_CO_API_KEY;

          console.log("api_key", api_key);
          console.log("address", address);

          const encodedAddress = encodeURIComponent(address);

          console.log("encodedAddress", encodedAddress);

          const url = `https://geocode.maps.co/search?q=${encodedAddress}&api_key=${api_key}`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (!data || data.length === 0) {
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

          const firstResult = data[0];
          const coordinates = {
            latitude: parseFloat(firstResult.lat),
            longitude: parseFloat(firstResult.lon),
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
            "Geocode an address to get latitude and longitude coordinates using maps.co API",
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