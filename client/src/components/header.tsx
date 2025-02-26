import React from 'react';
import { Image } from 'react-bootstrap';

const Header = () => {
  return (
    <header className='py-5 text-center'>
      <Image
        src={'https://www.directfn.com/dfn-icons/dfn-logo-blue.png'}
        alt='logo'
        className='mb-4 w-25'
      />
      <h2>Pro11 Release Uploader</h2>
    </header>
  );
};

export default Header;
