import { importJWK, jwtVerify } from 'jose';
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse, userAgent } from 'next/server';

const PRIVATE_MOBILE_ROUTES = ['/api/auth/mobile/logout'];
const SINGLE_USER_ROUTES = ['/courses', '/questions', '/bookmarks'];

const shouldRestrictSingleUser = (pathname: string) => {
  return SINGLE_USER_ROUTES.some((route) => pathname.startsWith(route));
};

const verifyJWT = async (token: string) => {
  const secret = process.env.JWT_SECRET || 'secret';
  const jwk = await importJWK({ k: secret, alg: 'HS256', kty: 'oct' });
  const payload = await jwtVerify(token, jwk);
  return payload;
};

export const handleMobileAuth = async (request: NextRequestWithAuth) => {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const pathname = request.nextUrl.pathname;
  if (token) {
    try {
      const payload: any = await verifyJWT(token);
      // @typo here
      const userId = payload.payload.userid;
      console.log(userId);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  } else if (PRIVATE_MOBILE_ROUTES.includes(pathname)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
};

export const nextAuthMiddleware = withAuth(async (req) => {
  if (process.env.LOCAL_CMS_PROVIDER) return;

  const pathname = req.nextUrl.pathname;

  if (shouldRestrictSingleUser(pathname)) {
    const token = req.nextauth.token;
    if (!token) {
      return NextResponse.redirect(new URL('/invalidsession', req.url));
    }
    const user = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL_LOCAL}/api/user?token=${token.jwtToken}`,
    );

    const json = await user.json();
    if (!json.user) {
      return NextResponse.redirect(new URL('/invalidsession', req.url));
    }
  }
});

export const getDeviceType = (request: NextRequest) => {
  const { device } = userAgent(request);
  return device.type;
};

export const isMobile = (request: NextRequest) => {
  const deviceType = getDeviceType(request);
  return deviceType === 'mobile' || deviceType === 'tablet';
};

export const isDesktop = (request: NextRequest) => {
  return !isMobile(request);
};
