import { Container, Spinner } from 'react-bootstrap';

const SplashScreen = () => {
  return (
    <Container className='d-flex justify-content-center'>
      <Spinner
        animation='border'
        variant='primary'
      />
    </Container>
  );
};

export default SplashScreen;
