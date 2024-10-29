import axios from 'axios';
import toast from 'react-hot-toast';


export const copyImageToClipboard = async (imageUrlData: string | URL): Promise<{ success: boolean; message: string }> => {
  try {
      // Check if the Clipboard API is supported and in a secure context
      
      if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(imageUrlData.toString());
          toast.success('Image URL copied to clipboard!'); // Show success toast
          return { success: true, message: 'Image URL copied to clipboard!' };
      } else {
          // Fallback method for unsupported environments
          const input = document.createElement('input');
          input.type = 'text'; // Set input type to text
          input.value = imageUrlData.toString();
          document.body.appendChild(input);
          input.select();
          const successful = document.execCommand('copy'); // Check if copy was successful
          document.body.removeChild(input);
          console.log("successful",successful)
          if (successful) {
              toast.success('Image URL copied to clipboard!'); // Show success toast
          } else {
              toast.error('Failed to copy image URL.'); // Show error toast
          }
          return { success: successful, message: successful ? 'Image URL copied to clipboard!' : 'Failed to copy image URL.' };
      }
  } catch (err) {
      console.error(err);
      toast.error('Failed to copy image URL.'); // Show error toast
      return { success: false, message: 'Failed to copy image URL.' };
  }
};


export const downloadImage = async (imageUrlData: string | URL) => {
  try {
      const imageUrl = imageUrlData instanceof URL ? imageUrlData.toString() : imageUrlData;
      //'https://storage.googleapis.com/xref-969e6.appspot.com/generated/lACG5w8VTRZQ4rkOiOZ0gcysX433/1729763317190.jpg?GoogleAccessId=firebase-adminsdk-6c3kr%40xref-969e6.iam.gserviceaccount.com&Expires=4897823400&Signature=eVuAf%2BgoTACnN%2BlKmWWBeo1LIMJAohNxyc1w16cGU%2ByFkxC%2FhX83s%2F%2BtIMFrPwTHGppF%2FLbnaC3%2FlrSehZVNsJSfgpzcMiq%2FmBf6esnaajp8fARHXuspwhDa4bntMUntyG%2FAcni%2B6Y0c5zEvQvT%2BKfN3AFGjId1nQjFixW8kaMy5S3bjnX5pBK4Dqv%2BSOgif1eOZyA5z%2Fg7ZrzYKJHxuvhVyr9vwD%2BJzO%2B2gw9CcUwrsHuLw3dMXh8jx9622RgHrKC%2Bu%2B8A4zsn7bG%2Fpsz5nchQwm8FrxMpjV%2BOYgnHn%2B%2BIn0SNZpKpn11LV7CE8bl68D99UXAhjHvLeBF%2FNLmkyMg%3D%3D'; // Replace with your image URL
      const response = await axios.get(imageUrl, {
          responseType: 'blob',
          headers: {
              'Content-Type': 'application/octet-stream', // Set appropriate header for blob response
          },
      });

      // Create a Blob URL for the downloaded image
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));

      // Create an anchor element to download the image
      const link = document.createElement('a');
      link.href = blobUrl;
      const timestamp = new Date().toISOString().replace(/[-:.]/g, ''); // Format timestamp
      link.setAttribute('download', `image_${timestamp}.png`); // Filename with timestamp

      document.body.appendChild(link);
      link.click();

      // Clean up by removing the anchor element
      document.body.removeChild(link);

  } catch (error) {
      console.error('Error downloading the image', error);
  }
};

export const shareImage = async () => {
  try {
    toast.success('Comming Soon');
  } catch (err) {
    console.log(err, "err");
    toast.error('Failed to copy image URL: ');
    alert('Failed to copy image URL.');
  }
};