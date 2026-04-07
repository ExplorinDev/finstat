import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city") || undefined;
  const page = parseInt(request.nextUrl.searchParams.get("page") || "0", 10);
  const pageSize = 50;

  try {
    const legalFormFilter = { in: ["112", "121", "118", "117"] };
    const where = city
      ? { city: { contains: city }, legalForm: legalFormFilter }
      : { legalForm: legalFormFilter };

    const [companies, total, citiesRaw] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { name: "asc" },
        skip: page * pageSize,
        take: pageSize,
        select: {
          ico: true,
          name: true,
          address: true,
          city: true,
        },
      }),
      prisma.company.count({ where }),
      prisma.company.groupBy({
        by: ["city"],
        where: { legalForm: legalFormFilter },
        _count: { city: true },
        orderBy: { _count: { city: "desc" } },
        take: 50,
      }),
    ]);

    const cities = citiesRaw
      .map((c) => c.city)
      .filter(Boolean)
      .sort();

    return NextResponse.json({
      total,
      companies,
      cities,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Browse error:", error);
    return NextResponse.json(
      { error: "Failed to browse companies" },
      { status: 500 }
    );
  }
}
