import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';

export default function NotFound() {
  return (
    <div className='flex h-screen flex-col items-center justify-center gap-2'>
      <p>404 - 页面不存在</p>
      <Link to={ROUTES.HOME}>返回首页</Link>
    </div>
  );
}
