const PublicLayout = ({ children }) => {
  return (
    <>
      <div>navbar here</div>
      <main>{children}</main>
      <div>footer</div>
    </>
  );
};

export default PublicLayout;
