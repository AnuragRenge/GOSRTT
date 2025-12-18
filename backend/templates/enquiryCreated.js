function enquiryCreatedTemplate({ name, phone, email, source }) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">

<!-- Banner -->
<div style="width: 100%;">
  <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e" alt="Travel Banner" style="width: 100%; height: 125px; display: block;">
</div>

<!-- Header with Glossy Gradient -->
<div style="background: linear-gradient(135deg, #00d4ff, #0077ff); padding: 20px; text-align: center; position: relative; overflow: hidden;">
  <!-- Glossy overlay -->
  <div style="position: absolute; top: 0; left: 0; right: 0; height: 70%; background: rgba(255,255,255,0.25); clip-path: polygon(0 0, 100% 0, 100% 50%, 0 100%);"></div>
  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: white; position: relative; z-index: 1;">New Enquiry / Lead Alert</h1>
</div>

<!-- Body -->
<div style="padding: 20px;">
  <p style="color: #555; font-size: 15px; line-height: 1.6;">
    Hello Admin,<br/>  
    A new enquiry/lead has just been created in the system. Please find the details below:
  </p>

  <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; font-weight: bold; color: #333;">Name</td>
      <td style="padding: 8px; border: 1px solid #eee; color: #555;">${name}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; font-weight: bold; color: #333;">Phone</td>
      <td style="padding: 8px; border: 1px solid #eee; color: #555;"><a href="tel:${phone}">${phone}</a></td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; font-weight: bold; color: #333;">Email</td>
      <td style="padding: 8px; border: 1px solid #eee; color: #555;">${email}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; font-weight: bold; color: #333;">Source</td>
      <td style="padding: 8px; border: 1px solid #eee; color: #555;">${source}</td>
    </tr>
  </table>

  <!-- Call to Action -->
  <!--<div style="text-align: center; margin: 25px 0;">-->
  <!--  <a href="https://your-admin-dashboard-link.com" style="background: linear-gradient(135deg, #00c6ff, #0072ff); color: white; padding: 12px 28px; border-radius: 30px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">-->
  <!--    🔍 View in Dashboard-->
  <!--  </a>-->
  <!--</div>-->
</div>

<!-- Footer -->
<div style="background-color: #f8f8f8; color: #777; font-size: 12px; text-align: center; padding: 12px;">
  &copy; ${new Date().getFullYear()} Sai Ram Tours & Travels. Internal Notification.
</div>

</div>  `;
}
module.exports = enquiryCreatedTemplate;