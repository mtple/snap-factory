/**
 * local-biz-search — search the support-local-businesses.com directory.
 *
 * Enter a business name, category, or ZIP code to find local businesses.
 * Uses the public directory at support-local-businesses.com (6.4M+ listings).
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "local-biz-search");

  // POST — user submitted a search query
  if (ctx.action.type === "post") {
    const query =
      typeof ctx.action.inputs?.query === "string"
        ? ctx.action.inputs.query.trim()
        : "";

    if (!query) {
      // Empty query — send back to the search screen
      const response: SnapHandlerResult = {
        version: "1.0",
        theme: { accent: "green" },
        ui: {
          root: "page",
          elements: {
            page: {
              type: "stack",
              props: { direction: "vertical", gap: "md" },
              children: ["title", "hint", "query_input", "search_btn", "share_btn"],
            },
            title: {
              type: "text",
              props: {
                content: "Search Local Businesses",
                weight: "bold",
              },
            },
            hint: {
              type: "text",
              props: {
                content: "Enter a business name, category, or ZIP code.",
                size: "sm",
              },
            },
            query_input: {
              type: "input",
              props: {
                name: "query",
                label: "Business name, category, or ZIP",
                placeholder: "e.g. coffee shop, plumber, 90210",
                maxLength: 100,
              },
            },
            search_btn: {
              type: "button",
              props: { label: "Search", variant: "primary" },
              on: {
                press: {
                  action: "submit",
                  params: { target: self },
                },
              },
            },
            share_btn: {
              type: "button",
              props: { label: "Share", variant: "secondary" },
              on: {
                press: {
                  action: "compose_cast",
                  params: {
                    text: "find local businesses with @freeturtle",
                    embeds: [self],
                  },
                },
              },
            },
          },
        },
      };
      return response;
    }

    // Build the directory URL
    const directoryUrl = `https://support-local-businesses.com/directory?search=${encodeURIComponent(query)}`;

    const truncated = query.length > 60 ? query.slice(0, 57) + "..." : query;

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "green" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "result_text", "view_btn", "search_again_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Local Business Search",
              weight: "bold",
            },
          },
          result_text: {
            type: "text",
            props: {
              content: `Searching for "${truncated}" in 6.4M+ local business listings.`,
              size: "sm",
            },
          },
          view_btn: {
            type: "button",
            props: { label: "View Results", variant: "primary" },
            on: {
              press: {
                action: "open_url",
                params: { target: directoryUrl },
              },
            },
          },
          search_again_btn: {
            type: "button",
            props: { label: "Search again", variant: "secondary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
              },
            },
          },
          share_btn: {
            type: "button",
            props: { label: "Share", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "find local businesses with @freeturtle",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // GET — initial render
  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "green" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "subtitle", "query_input", "search_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "Search Local Businesses",
            weight: "bold",
          },
        },
        subtitle: {
          type: "text",
          props: {
            content:
              "6.4M+ listings across 41k ZIP codes. Find any business near you.",
            size: "sm",
          },
        },
        query_input: {
          type: "input",
          props: {
            name: "query",
            label: "Business name, category, or ZIP",
            placeholder: "e.g. coffee shop, plumber, 90210",
            maxLength: 100,
          },
        },
        search_btn: {
          type: "button",
          props: { label: "Search", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "find local businesses with @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
