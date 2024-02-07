import { useRef, useState } from 'react';
import { Button, Card, Container, Form } from 'react-bootstrap';
import { useAuth } from '../hooks/use-auth';

const Login = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const { signIn } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const email = formRef.current?.email.value;
    const password = formRef.current?.password.value;

    if (email && password) {
      setError('');
      setIsAuthenticating(true);

      try {
        await signIn(email, password);
      } catch (e) {
        setError('Authentication failed');
      }

      setIsAuthenticating(false);
    } else {
      setError('Credentials cannot be empty');
    }
  };

  return (
    <Container style={{ maxWidth: '34em' }}>
      <Card className='shadow-lg'>
        <Card.Body className='p-5'>
          <Card.Title
            as={'h4'}
            className='fw-bold'
          >
            Login
          </Card.Title>
          <Card.Subtitle className='mb-4'>Use JIRA Credentials</Card.Subtitle>
          <Form ref={formRef}>
            <Form.Group className='mb-3'>
              <Form.Label>E-mail Address</Form.Label>
              <Form.Control
                type='email'
                name='email'
                disabled={isAuthenticating}
                required={true}
                autoFocus={true}
                onChange={() => setError('')}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Password</Form.Label>
              <Form.Control
                type='password'
                name='password'
                disabled={isAuthenticating}
                required={true}
                onChange={() => setError('')}
              />
            </Form.Group>
            {error && (
              <Container className='bg-danger text-light rounded'>
                <p className='py-2 text-center fs-6 fw-light'>{error}</p>
              </Container>
            )}
            <div className='d-grid'>
              <Button
                variant='primary'
                type='submit'
                disabled={isAuthenticating}
                onClick={onSubmit}
              >
                Login
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
