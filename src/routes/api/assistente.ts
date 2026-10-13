import { createFileRoute } from "@tanstack/react-router";
import { handleAssistente } from "@/lib/assistente/assistente.server";

export const Route = createFileRoute("/api/assistente")({
  server: { handlers: { POST: ({ request }) => handleAssistente(request) } },
});
