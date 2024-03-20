import {} from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className='my-5 pt-5 text-muted text-center text-small'>
      © {new Date().getFullYear()} DirectFN <br />
      <small>v{import.meta.env.PACKAGE_VERSION}</small>
    </footer>
  );
};

export default Footer;
