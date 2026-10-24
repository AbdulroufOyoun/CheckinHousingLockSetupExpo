module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.checkinhousing.saltojustin.SaltoJustinPackage;',
        packageInstance: 'new SaltoJustinPackage()',
      },
    },
  },
};
