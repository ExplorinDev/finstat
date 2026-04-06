import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCompanyDetail } from "@/lib/ares";

export async function GET(request: NextRequest) {
  const ico = request.nextUrl.searchParams.get("ico");

  if (!ico || !/^\d{7,8}$/.test(ico.trim())) {
    return NextResponse.json({ error: "Invalid IČO" }, { status: 400 });
  }

  const paddedIco = ico.trim().padStart(8, "0");

  try {
    // Check if we have fresh cached data (less than 24h old)
    const cached = await prisma.company.findUnique({
      where: { ico: paddedIco },
      include: { statutoryMembers: true, shareholders: true },
    });

    const isFresh =
      cached &&
      cached.statutoryMembers.length > 0 &&
      Date.now() - cached.cachedAt.getTime() < 24 * 60 * 60 * 1000;

    if (isFresh) {
      return NextResponse.json(cached);
    }

    // Fetch from ARES VR
    const detail = await getCompanyDetail(paddedIco);

    if (!detail) {
      return NextResponse.json(
        { error: "Company not found in VR" },
        { status: 404 }
      );
    }

    // Save to DB with full detail
    const company = await prisma.company.upsert({
      where: { ico: paddedIco },
      update: {
        name: detail.name,
        address: detail.address,
        city: detail.city,
        region: detail.region || null,
        district: detail.district || null,
        legalForm: detail.legalForm || null,
        dateCreated: detail.dateCreated
          ? new Date(detail.dateCreated)
          : null,
        dateDeleted: detail.dateDeleted
          ? new Date(detail.dateDeleted)
          : null,
        status: detail.status || null,
        cachedAt: new Date(),
      },
      create: {
        ico: paddedIco,
        name: detail.name,
        address: detail.address,
        city: detail.city,
        region: detail.region || null,
        district: detail.district || null,
        legalForm: detail.legalForm || null,
        dateCreated: detail.dateCreated
          ? new Date(detail.dateCreated)
          : null,
        dateDeleted: detail.dateDeleted
          ? new Date(detail.dateDeleted)
          : null,
        status: detail.status || null,
      },
    });

    // Replace statutory members
    await prisma.statutoryMember.deleteMany({
      where: { companyIco: paddedIco },
    });
    if (detail.statutoryMembers.length > 0) {
      await prisma.statutoryMember.createMany({
        data: detail.statutoryMembers.map((m) => ({
          companyIco: paddedIco,
          firstName: m.firstName || null,
          lastName: m.lastName || null,
          titleBefore: m.titleBefore || null,
          titleAfter: m.titleAfter || null,
          role: m.role || null,
          dateFrom: m.dateFrom ? new Date(m.dateFrom) : null,
          dateTo: m.dateTo ? new Date(m.dateTo) : null,
        })),
      });
    }

    // Replace shareholders
    await prisma.shareholder.deleteMany({
      where: { companyIco: paddedIco },
    });
    if (detail.shareholders.length > 0) {
      await prisma.shareholder.createMany({
        data: detail.shareholders.map((s) => ({
          companyIco: paddedIco,
          firstName: s.firstName || null,
          lastName: s.lastName || null,
          companyName: s.companyName || null,
          shareholderIco: s.shareholderIco || null,
          shareText: s.shareText || null,
          dateFrom: s.dateFrom ? new Date(s.dateFrom) : null,
          dateTo: s.dateTo ? new Date(s.dateTo) : null,
        })),
      });
    }

    // Return full data
    const result = await prisma.company.findUnique({
      where: { ico: paddedIco },
      include: { statutoryMembers: true, shareholders: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Company detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company detail" },
      { status: 500 }
    );
  }
}
