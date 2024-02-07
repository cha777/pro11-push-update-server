import { Container, Modal, ModalProps } from 'react-bootstrap';

interface UploadNotificationProps extends ModalProps {
  isSuccess: boolean;
}

const baseUrlPaths = window.location.href.split('/');
baseUrlPaths.pop();
const baseUrl = baseUrlPaths.join('/');

const UploadNotification = ({ isSuccess, message, onHide, ...props }: UploadNotificationProps) => {
  return (
    <Modal
      {...props}
      centered
      size='sm'
    >
      <Modal.Header
        className='border-0'
        closeButton
        closeLabel='x'
        onHide={onHide}
      ></Modal.Header>
      <Modal.Body>
        {/* <p className='text-center'>{message}</p> */}
        <Container className='text-center p-2 w-100'>
          <img
            style={{ width: '100px' }}
            className='h-auto mt-0 mx-auto mb-3'
            src={baseUrl + (isSuccess ? '/success.png' : '/error.png')}
            alt=''
          />
          <h2 className='mb-5'>{`Upload ${isSuccess ? 'Successful' : 'Failed'}`}</h2>
        </Container>
      </Modal.Body>
    </Modal>
  );
};

export default UploadNotification;
