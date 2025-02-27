import { Image } from 'react-bootstrap';

const Header = () => {
  return (
    <header
      className='py-5 mx-auto text-center'
      style={{ maxWidth: '34em' }}
    >
      <Image
        src={'https://www.directfn.com/dfn-icons/dfn-logo-blue.png'}
        alt='logo'
        className='mb-4 w-50'
      />
      <h2>Pro11 Release Uploader</h2>
    </header>
  );
};

export default Header;
