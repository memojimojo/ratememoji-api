const {Rekognition, S3} = require('aws-sdk');
const detectFace = require('./detect-face');
const crop = require('./crop');
const client = new Rekognition();

exports.handler = async function (event, context) {
    const bucket = event.Records[0].s3.bucket.name;
    const file = event.Records[0].s3.object.key;
    const s3Object = {
        Bucket: bucket,
        Name: file,
    };

    const moderation = await client.detectModerationLabels({
        Image: {
            S3Object: s3Object
        }
    }).promise();
    if (moderation.ModerationLabels.length > 0) {
        console.error('Image is unsafe', moderation.ModerationLabels);
        return;
    }

    if (file.endsWith('raw-portrait.jpg')) {
        const dest = file.substr(0,file.lastIndexOf('/')) + '/portrait.jpg';
        const face = await detectFace(s3Object);
        if (face) {
            const s3 = new S3();
            const object = await s3.getObject({
                Bucket: bucket,
                Key: file,
            }).promise();
            const image = await crop(object.Body, face);
            await s3.putObject({
                Bucket: bucket,
                Key: dest,
                Body: await image.toBuffer(),
            }).promise();
        }
    }
};
