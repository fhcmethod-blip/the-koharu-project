import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/ChatWindow";
import { getCharacter } from "@/lib/characters";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-card-border px-4 py-2 text-xs text-muted md:hidden">
        <Link href="/app/characters">← Companions</Link>
      </div>
      <ChatWindow character={character} />
    </div>
  );
}
