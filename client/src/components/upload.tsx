import axios from 'axios';
import { useRef, useState } from 'react';
import { Button, Card, Container, Form, FormGroup, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../hooks/use-auth';
import UploadNotification from './upload-notification';

const STORAGE_KEY = 'jira-token';

const Uploader = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alert, setAlert] = useState({ isSuccessful: false, message: '' });
  const { user } = useAuth();

  const onSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const versionName = formRef.current?.version.value;
    const release = formRef.current?.release.files[0];

    if (!versionName) {
      setError('Please select a version');
      return;
    }

    if (!release || (release.type !== 'application/zip' && release.type !== 'application/x-zip-compressed')) {
      setError('Invalid selection for release file. Please select a proper zip file');
      return;
    }

    const versionNumber = versionName.split('_').pop().split('-').shift().replaceAll('.', '');
    const releaseFileName = release.name.split('.').shift().split('_').shift();

    if (releaseFileName.length !== 10 || !releaseFileName.startsWith(versionNumber)) {
      setError('Selected version number and release zip does not match');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('versionName', versionName);
      formData.append('release', release);

      const baseUrlPaths = window.location.href.split('/');
      baseUrlPaths.pop();
      const baseUrl = baseUrlPaths.join('/');
      const authToken = sessionStorage.getItem(STORAGE_KEY);

      setError('');
      setIsUploading(true);
      setUploadProgress(0);

      const response = await axios({
        method: 'post',
        url: '/createRelease',
        baseURL: baseUrl,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Basic ${authToken}`,
        },
        responseType: 'json',
        onUploadProgress: ({ loaded, total }) => {
          setUploadProgress(total ? Math.round((100 * loaded) / total) : 0);
        },
      });

      const isSuccessful = response.status >= 200 && response.status <= 303;

      setShowAlert(true);
      setAlert({
        isSuccessful,
        message: isSuccessful ? response.data.message : response.data.error,
      });

      setIsUploading(false);
    } catch (error) {
      setShowAlert(true);
      setAlert({
        isSuccessful: false,
        message: 'Error while uploading release',
      });

      setIsUploading(false);
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
            Release Info
          </Card.Title>
          <Card.Subtitle className='mb-4'>{user?.projectName}</Card.Subtitle>
          <Form ref={formRef}>
            <Form.Group className='mb-3'>
              <Form.Label>Version</Form.Label>
              <Form.Select
                name='version'
                disabled={isUploading}
                onChange={() => setError('')}
              >
                {user?.versions.map((version) => (
                  <option key={version.id}>{version.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Release file</Form.Label>
              <Form.Control
                name='release'
                disabled={isUploading}
                type='file'
                onChange={() => setError('')}
              />
            </Form.Group>
            {error && (
              <Container className='bg-danger text-light rounded'>
                <p className='py-2 text-center fs-6 fw-light'>{error}</p>
              </Container>
            )}
            <div className='d-grid mb-3'>
              <Button
                variant='primary'
                type='submit'
                disabled={isUploading}
                onClick={onSubmit}
              >
                {isUploading ? 'Uploading...' : 'Submit'}
              </Button>
            </div>
            {isUploading && (
              <FormGroup>
                <ProgressBar
                  animated
                  now={uploadProgress}
                />
              </FormGroup>
            )}
          </Form>
        </Card.Body>
      </Card>

      <UploadNotification
        show={showAlert}
        message={alert.message}
        isSuccess={alert.isSuccessful}
        onHide={() => setShowAlert(false)}
      />
    </Container>
  );
};

export default Uploader;
