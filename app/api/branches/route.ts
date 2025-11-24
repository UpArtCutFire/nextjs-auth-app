import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const branches = await prisma.branch.findMany({
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json(branches)
  } catch (error) {
    console.error('Error al obtener sucursales:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, direccion, telefono } = body

    if (!nombre || !direccion) {
      return NextResponse.json(
        { error: 'Nombre y dirección son requeridos' },
        { status: 400 }
      )
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { nombre }
    })

    if (existingBranch) {
      return NextResponse.json(
        { error: 'Ya existe una sucursal con ese nombre' },
        { status: 409 }
      )
    }

    const newBranch = await prisma.branch.create({
      data: {
        nombre,
        direccion,
        telefono: telefono || null
      }
    })

    return NextResponse.json(newBranch, { status: 201 })
  } catch (error) {
    console.error('Error al crear sucursal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nombre, direccion, telefono, activo } = body

    if (!id || !nombre || !direccion) {
      return NextResponse.json(
        { error: 'ID, nombre y dirección son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que no exista otra sucursal con el mismo nombre
    const existingBranch = await prisma.branch.findFirst({
      where: {
        nombre,
        NOT: { id }
      }
    })

    if (existingBranch) {
      return NextResponse.json(
        { error: 'Ya existe otra sucursal con ese nombre' },
        { status: 409 }
      )
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        nombre,
        direccion,
        telefono: telefono || null,
        activo: activo !== undefined ? activo : true
      }
    })

    return NextResponse.json(updatedBranch)
  } catch (error) {
    console.error('Error al actualizar sucursal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de sucursal requerido' },
        { status: 400 }
      )
    }

    // Verificar si la sucursal tiene despachos asociados
    const dispatchCount = await prisma.dispatch.count({
      where: { branchId: id }
    })

    if (dispatchCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una sucursal con despachos asociados' },
        { status: 409 }
      )
    }

    await prisma.branch.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Sucursal eliminada exitosamente' })
  } catch (error) {
    console.error('Error al eliminar sucursal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}