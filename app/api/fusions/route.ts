import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EFFORT_LEVELS } from "@/lib/fusion";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const fusions = await db.fusionTemplate.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return Response.json({ fusions });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  if (!data.name?.trim() || !data.leadModel) {
    return Response.json({ error: "Naam en lead-model zijn vereist" }, { status: 400 });
  }
  const fusion = await db.fusionTemplate.create({
    data: {
      userId: user.id,
      name: data.name.trim(),
      description: data.description ?? "",
      leadModel: data.leadModel,
      leadEffort: EFFORT_LEVELS.includes(data.leadEffort) ? data.leadEffort : "",
      sidekick1: data.sidekick1 ?? "",
      sidekick2: data.sidekick2 ?? "",
    },
  });
  return Response.json({ fusion }, { status: 201 });
}
