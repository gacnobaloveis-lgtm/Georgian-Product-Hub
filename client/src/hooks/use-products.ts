import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Product } from "@shared/schema";

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.products.create.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let errorMsg = "პროდუქტის შექმნა ვერ მოხერხდა";
        try {
          const errJson = await res.json();
          errorMsg = errJson.field ? `${errJson.field}: ${errJson.message}` : (errJson.message || errorMsg);
        } catch {
          const text = await res.text();
          if (text) errorMsg = text;
        }
        throw new Error(`შეცდომა ${res.status}: ${errorMsg}`);
      }

      return res.json() as Promise<Product>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let errorMsg = "პროდუქტის რედაქტირება ვერ მოხერხდა";
        try {
          const errJson = await res.json();
          errorMsg = errJson.message || errorMsg;
        } catch {
          const text = await res.text();
          if (text) errorMsg = text;
        }
        throw new Error(errorMsg);
      }

      return res.json() as Promise<Product>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        let errorMsg = "პროდუქტის წაშლა ვერ მოხერხდა";
        try {
          const errJson = await res.json();
          errorMsg = errJson.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}
