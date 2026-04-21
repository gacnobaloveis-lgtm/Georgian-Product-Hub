import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Media } from "@shared/schema";

export function useMedia() {
  return useQuery<Media[]>({
    queryKey: [api.media.list.path],
    queryFn: async () => {
      const res = await fetch(api.media.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch media");
      return res.json();
    },
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(api.media.upload.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: "ატვირთვის შეცდომა" }));
        throw new Error(errJson.message || "ატვირთვის შეცდომა");
      }

      return res.json() as Promise<Media[]>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}
