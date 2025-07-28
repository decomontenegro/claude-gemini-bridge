import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // This endpoint can be used to fetch history from a backend database
    // For now, it returns a success response as the data is stored in browser localStorage
    
    return NextResponse.json({
      success: true,
      message: 'History data is stored locally in the browser'
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // This endpoint can be used to sync history to a backend database
    // For now, it just acknowledges the request
    
    console.log('History sync request:', body)
    
    return NextResponse.json({
      success: true,
      message: 'History sync acknowledged'
    })
  } catch (error) {
    console.error('Error syncing history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync history' },
      { status: 500 }
    )
  }
}