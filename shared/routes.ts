import { z } from "zod";
import { insertProductSchema, products, media } from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  products: {
    create: {
      method: "POST" as const,
      path: "/api/products" as const,
      input: insertProductSchema.extend({
        originalPrice: z.union([z.string(), z.number()]).transform(v => String(v)),
        discountPrice: z.union([z.string(), z.number()]).optional().transform(v => v ? String(v) : undefined),
        shippingPrice: z.union([z.string(), z.number()]).optional().transform(v => v ? String(v) : undefined),
        stock: z.union([z.string(), z.number()]).transform(v => Number(v) || 0),
        categoryId: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
      }),
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/products" as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/products/:id" as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/products/:id" as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  media: {
    upload: {
      method: "POST" as const,
      path: "/api/media/upload" as const,
      responses: {
        201: z.array(z.custom<typeof media.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/media" as const,
      responses: {
        200: z.array(z.custom<typeof media.$inferSelect>()),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/media/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProductInput = z.infer<typeof api.products.create.input>;
export type ProductResponse = z.infer<typeof api.products.create.responses[201]>;
