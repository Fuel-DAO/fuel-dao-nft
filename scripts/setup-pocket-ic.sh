cd test
mkdir pocket-ic 2>/dev/null
cd pocket-ic
wget https://github.com/dfinity/pocketic/releases/download/3.0.1/pocket-ic-x86_64-linux.gz -O pocket-ic.gz
gzip -d pocket-ic.gz
chmod +x pocket-ic