import { NextRequest, NextResponse } from 'next/server'

// In-memory store (replace with a database in production)
const waitlist: string[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check for duplicates
    if (waitlist.includes(email.toLowerCase())) {
      return NextResponse.json(
        { message: 'You are already on the waitlist!' },
        { status: 200 }
      )
    }

    waitlist.push(email.toLowerCase())

    return NextResponse.json(
      {
        message: 'Successfully joined the waitlist!',
        position: waitlist.length,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
